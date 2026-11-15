
import { useNavigate } from 'react-router-dom';

import RichText from "./RichText.jsx";

import "../../styles/DocumentCards.css";


function DocumentCards({ chatId, messageId, documents }) {
    const navigate = useNavigate();

    const assignColor = (str) => {
        if (str.includes("<span class=")) {
            if (str.includes("peach")) return "peach";
            if (str.includes("yellow")) return "yellow";
            if (str.includes("pink")) return "pink";
            if (str.includes("purple")) return "purple";
            if (str.includes("green")) return "green";
            if (str.includes("cyan")) return "cyan";
        }
    }

    return (
        <div className="DocumentCards">
            <p className="docs-used-p">Использованные документы</p>
                <div className="document-card-container">
                {documents.map((doc, index) => (
                    <div
                        key={index}
                        className="document-card"
                        onClick={() => navigate(`/${chatId}/${messageId}/${doc.id}`)}
                    >
                        <div className="document-card-upper">
                            <div className={`circle ${assignColor(doc.title)}`}>
                                {index + 1}
                            </div>
                            <div className="proceed-to">
                                <p className="btn-p">Перейти</p>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </div>
                        </div>
                        <h3 className="document-title">
                            <RichText text={doc.title} />
                        </h3>
                    </div>
                ))}
            </div>
        </div>
    );
}


export default DocumentCards;