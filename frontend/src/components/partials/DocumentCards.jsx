
import { useNavigate } from 'react-router-dom';

import RichText from "./RichText.jsx";
import { assignColor, stripTags } from "../../utils/highlights.js";

import "../../styles/DocumentCards.css";


function DocumentCards({ chatId, messageId, documents, isOpened = false }) {
    const navigate = useNavigate();

    return (
        <div className="DocumentCards">
            <p className="docs-used-p">Использованные документы</p>
                <div className="document-card-container">
                {documents.map((doc, index) => (
                    <div
                        key={index}
                        className={`document-card ${isOpened ? color : ""}`}
                        onClick={() => navigate(`/${chatId}/${messageId}/${doc.id}`)}
                    >
                        <div className="document-card-upper">
                            <div className={`circle ${assignColor(doc.title)}`}>
                                {index + 1}
                            </div>
                            {isOpened ? (
                                <p className="btn-p opened-note">Документ открыт в режиме просмотра</p>
                            ) : (
                                <div className="proceed-to">
                                    <p className="btn-p">Перейти</p>
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </div>
                            )}
                        </div>
                        <h3 className="document-title">
                            {isOpened ? stripTags(doc.title) : <RichText text={doc.title} />}
                        </h3>
                    </div>
                ))}
            </div>
        </div>
    );
}


export default DocumentCards;