from openai import OpenAI


def make_client(settings):
    return OpenAI(base_url=settings.base_url, api_key=settings.api_key,
                  timeout=180.0, max_retries=2)
