
import { useParams, useNavigate } from "react-router-dom";

import { useFetchGet } from "./hooks/useFetchGet.js";
import RichText from "./partials/RichText.jsx";
import DocumentCards from "./partials/DocumentCards.jsx";
import { assignColor, filterHighlights, prefixH1 } from "../utils/highlights.js";

import "../styles/SplitView.css";


const API_URL = import.meta.env.VITE_LOCAL_API_URL;

function SplitView() {
    const { chat_id, msg_id, document_id } = useParams();
    const navigate = useNavigate();

    const { data, loading, error } = useFetchGet(
        `${API_URL}/api/v1/${chat_id}/${msg_id}/${document_id}`
    );

    if (loading) {
        return (
            <div id="SplitView">
                <p className="split-status">Загрузка...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div id="SplitView">
                <p className="split-status">Ошибка загрузки: {error}</p>
            </div>
        );
    }

    const { user_message, assistant_message, opened_document } = data;

    const openedColor = assignColor(opened_document.title);
    const openedNumber = assistant_message.documents.findIndex((doc) => doc.id === opened_document.id) + 1;

    const goBackToChat = () => {
        navigate(`/${chat_id}`);
    };

    return (
        <div id="SplitView">
            <div className="split-left">
                <div className="back-button" onClick={goBackToChat}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    <p className="back-p">Назад к чату</p>
                </div>

                <div className="split-user-bubble">
                    <RichText text={filterHighlights(user_message.content, openedColor)} />
                </div>

                <DocumentCards
                    chatId={chat_id}
                    messageId={msg_id}
                    documents={assistant_message.documents}
                    openedDocId={opened_document.id}
                />

                <div className="split-answer">
                    <RichText text={prefixH1(filterHighlights(assistant_message.content, openedColor))} />
                </div>

                <div className="back-button back-bottom" onClick={goBackToChat}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    <p className="back-p">Назад к чату</p>
                </div>
            </div>

            <div className="split-right">
                <div className="document-view">
                    <div className="document-view-upper">
                        <div className={`circle ${openedColor}`}>
                            {openedNumber}
                        </div>
                        <p className="view-mode-p">Просмотр документа</p>
                    </div>
                    <h2 className="document-view-title">
                        <RichText text={filterHighlights(opened_document.title, openedColor)} />
                    </h2>
                    <div className="document-view-content">
                        <RichText text={filterHighlights(opened_document.content, openedColor)} />
                    </div>
                </div>
            </div>
        </div>
    );
}


export default SplitView;