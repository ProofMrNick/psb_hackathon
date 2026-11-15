"""Offline API/ingestion tests, no LLM requests.

Run from ml/: python -m unittest discover -s tests -v
"""
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from api import app, get_pipeline
from src.ingestion.loader import build_chunks, load_documents, locate_chunk_spans
from src.pipeline import RAGPipeline
from src.verification.evidence_spans import citation_evidence
from unittest.mock import patch


EXAMPLE_TEXT = 'Статья 70. Испытание при приеме на работу.\nДля главного бухгалтера срок шесть месяцев.'


class FakePipeline:
    def __init__(self):
        self.documents = {'sample.txt': EXAMPLE_TEXT}
        self.chunks = [dict(chunk_id='chunk_000000', document_id='sample.txt',
                            title='Sample | Статья 70', text=EXAMPLE_TEXT)]
        self.chunk_spans = {'chunk_000000': (0, len(EXAMPLE_TEXT))}
        self.last_question = None

    def answer_with_sources(self, question, top_k=None):
        self.last_question = question
        source = dict(document_id='sample.txt', filename='sample.txt',
                      chunk_id='chunk_000000', title='Sample | Статья 70',
                      text=EXAMPLE_TEXT, excerpt=EXAMPLE_TEXT, start_char=0,
                      end_char=len(EXAMPLE_TEXT), rank=1, rrf_score=0.02,
                      dense_score=0.70, bm25_score=4.0, cited_in_answer=True)
        answer = 'Шесть месяцев (ст. 70 ТК РФ).'
        linked = {**source, 'answer_start_char': 0, 'answer_end_char': len(answer),
                  'answer_text': answer}
        return {'answer': answer, 'sources': [source], 'evidence': [linked]}

    def retrieve_with_scores(self, question, top_k=None):
        self.last_question = question
        return [{'chunk': self.chunks[0], 'rank': 1,
                 'rrf_score': 0.02, 'dense_score': 0.70, 'bm25_score': 4.0}]

    def sources_from_results(self, results):
        return [RAGPipeline._source(self, item) for item in results]


class TestAPI(unittest.TestCase):
    def setUp(self):
        self.pipeline = FakePipeline()
        app.dependency_overrides[get_pipeline] = lambda: self.pipeline
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()

    def test_answer_has_quote_filename_and_evidence(self):
        response = self.client.post('/api/v1/answer', json={
            'question': 'А для главного бухгалтера?',
            'history': [{'role': 'user', 'content': 'Какой срок испытания?'}],
        })
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['answer'], 'Шесть месяцев (ст. 70 ТК РФ).')
        self.assertEqual(payload['sources'][0]['filename'], 'sample.txt')
        self.assertEqual(payload['sources'][0]['text'], EXAMPLE_TEXT)
        self.assertEqual(payload['evidence'][0]['text'], EXAMPLE_TEXT)
        ev = payload['evidence'][0]
        self.assertEqual(payload['answer'][ev['answer_start_char']:ev['answer_end_char']], ev['answer_text'])
        self.assertEqual(ev['answer_text'], payload['answer'])
        self.assertEqual(payload['sources'][0]['start_char'], 0)
        self.assertNotIn('answer_start_char', payload['sources'][0])
        self.assertIn('Пользователь: Какой срок испытания?', self.pipeline.last_question)

    def test_search_returns_excerpt_and_document_lookup(self):
        response = self.client.post('/api/v1/search', json={'question': 'срок'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['sources'][0]['filename'], 'sample.txt')
        self.assertEqual(response.json()['sources'][0]['text'], EXAMPLE_TEXT)
        self.assertEqual(self.client.get('/api/v1/documents').json()[0]['filename'], 'sample.txt')
        doc = self.client.get('/api/v1/document', params={'document_id': 'sample.txt'})
        self.assertEqual(doc.status_code, 200)
        self.assertEqual(doc.json()['text'], EXAMPLE_TEXT)
        self.assertEqual(self.client.get('/api/v1/document', params={'document_id': '../secret'}).status_code, 404)

    def test_validation(self):
        self.assertEqual(self.client.get('/health').json()['status'], 'ok')
        self.assertEqual(self.client.post('/api/v1/answer', json={'question': ''}).status_code, 422)


class TestIngestion(unittest.TestCase):
    def test_chunk_spans(self):
        data = Path(__file__).resolve().parents[1] / 'data'
        if not (data / 'knowledge-base.zip').exists():
            self.skipTest('Test KB archive not included')
        docs = load_documents(data)
        chunks = build_chunks(docs)
        positions = locate_chunk_spans(docs, chunks)
        self.assertEqual(len(docs), 21)
        self.assertEqual(len(chunks), 289)
        self.assertEqual(len(positions), len(chunks))
        self.assertLessEqual(max(len(chunk['text']) for chunk in chunks), 1650)
        for chunk in chunks:
            original = docs[chunk['document_id']]
            start, end = positions[chunk['chunk_id']]
            self.assertIn(chunk['text'].splitlines()[0], original[start:end])
            # Positions are true spans into the original document text.
            self.assertGreater(end, start)

    def test_cited_sources_and_verbatim_span(self):
        pipeline = object.__new__(RAGPipeline)
        pipeline.documents = {'law/sample.txt': EXAMPLE_TEXT}
        pipeline.chunk_spans = {'c1': (0, len(EXAMPLE_TEXT))}
        results = [{'chunk': {'chunk_id': 'c1', 'document_id': 'law/sample.txt',
                              'title': 'ТК РФ | Статья 70', 'text': EXAMPLE_TEXT},
                    'rank': 1, 'rrf_score': 0.031, 'dense_score': 0.7, 'bm25_score': 8.5}]
        src = pipeline.sources_from_results(results)[0]
        self.assertEqual(src['filename'], 'sample.txt')
        self.assertEqual(src['text'], EXAMPLE_TEXT)
        self.assertEqual(src['end_char'], len(EXAMPLE_TEXT))
        self.assertEqual(pipeline._cited_chunk_ids('Шесть месяцев (ст. 70 ТК РФ).', results), {'c1'})
        self.assertEqual(pipeline._cited_chunk_ids('Шесть месяцев.', results), set())


class TestAnswerEvidenceHighlight(unittest.TestCase):
    def setUp(self):
        self.answer = 'Для главного бухгалтера срок — шесть месяцев (ст. 70 ТК РФ).'
        self.text70 = 'Статья 70. Испытание при приеме на работу. Для главного бухгалтера срок шесть месяцев.'
        self.text71 = 'Статья 71. Результат испытания при приеме на работу.'
        self.results = [
            {'chunk': {'chunk_id': 'c70', 'document_id': 'законы__ТК_ст70.txt',
                       'title': 'ТК РФ | Статья 70', 'text': self.text70},
             'rank': 1, 'rrf_score': 0.03, 'dense_score': 0.8, 'bm25_score': 10},
            {'chunk': {'chunk_id': 'c71', 'document_id': 'законы__ТК_ст71.txt',
                       'title': 'ТК РФ | Статья 71', 'text': self.text71},
             'rank': 2, 'rrf_score': 0.02, 'dense_score': 0.6, 'bm25_score': 6},
        ]
        self.pipeline = object.__new__(RAGPipeline)
        self.pipeline.documents = {'законы__ТК_ст70.txt': self.text70,
                                   'законы__ТК_ст71.txt': self.text71}
        self.pipeline.chunk_spans = {'c70': (0, len(self.text70)),
                                     'c71': (0, len(self.text71))}
        self.sources = self.pipeline.sources_from_results(self.results)

    def test_full_sentence_span_and_source(self):
        message = 'Общий срок — три месяца (ст. 71 ТК РФ). ' + self.answer
        evidence = citation_evidence(message, self.results, self.sources)
        self.assertEqual(len(evidence), 2)
        self.assertEqual(evidence[0]['chunk_id'], 'c71')
        self.assertEqual(evidence[1]['chunk_id'], 'c70')
        self.assertEqual(evidence[1]['answer_text'], self.answer)
        self.assertEqual(message[evidence[1]['answer_start_char']:evidence[1]['answer_end_char']],
                         self.answer)
        self.assertEqual(evidence[1]['filename'], 'законы__ТК_ст70.txt')
        self.assertEqual(evidence[1]['text'], self.text70)
        self.assertEqual(self.text70[evidence[1]['start_char']:evidence[1]['end_char']],
                         self.text70)

    def test_repeated_source_has_independent_answer_spans(self):
        msg = ('Шесть месяцев (ст. 70 ТК РФ). '
               'Испытание согласовывается при приеме (ст. 70 ТК РФ).')
        ev = citation_evidence(msg, self.results, self.sources)
        self.assertEqual(len(ev), 2)
        self.assertTrue(all(e['chunk_id'] == 'c70' for e in ev))
        self.assertNotEqual(ev[0]['answer_start_char'], ev[1]['answer_start_char'])
        for item in ev:
            self.assertEqual(msg[item['answer_start_char']:item['answer_end_char']], item['answer_text'])

    def test_no_citation_no_auto_link(self):
        self.assertEqual(citation_evidence('Срок — шесть месяцев.', self.results, self.sources), [])
        self.assertEqual(citation_evidence('Срок — шесть месяцев (ст. 90 ТК РФ).',
                                          self.results, self.sources), [])

    def test_citation_only_following_claim(self):
        msg = 'Максимальный срок — шесть месяцев. Основание: ст. 70 ТК РФ.'
        ev = citation_evidence(msg, self.results, self.sources)
        self.assertEqual(len(ev), 1)
        self.assertEqual(ev[0]['answer_text'], msg)

    def test_sentence_abbreviation_and_unicode_offsets(self):
        msg = '✅ Для главного бухгалтера — шесть месяцев (ст. 70 ТК РФ). Следующий факт.'
        ev = citation_evidence(msg, self.results, self.sources)
        self.assertEqual(len(ev), 1)
        self.assertEqual(ev[0]['answer_text'], '✅ Для главного бухгалтера — шесть месяцев (ст. 70 ТК РФ).')
        self.assertEqual(msg[ev[0]['answer_start_char']:ev[0]['answer_end_char']], ev[0]['answer_text'])

    def test_pipeline_answers_include_positions(self):
        self.pipeline.client = object()
        self.pipeline.settings = object()
        with patch.object(self.pipeline, 'retrieve_with_scores', return_value=self.results), \
             patch('src.pipeline.generate_answer', return_value=self.answer):
            result = self.pipeline.answer_with_sources('Срок?')
        self.assertEqual(result['answer'], self.answer)
        self.assertEqual(len(result['evidence']), 1)
        self.assertEqual(result['evidence'][0]['answer_text'], self.answer)
        self.assertTrue(result['sources'][0]['cited_in_answer'])
        self.assertFalse(result['sources'][1]['cited_in_answer'])



if __name__ == '__main__':
    unittest.main()
