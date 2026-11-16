
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import SideBar from "./partials/SideBar.jsx";
import PromptInput from "./partials/PromptInput.jsx";

import "../styles/NewChat.css";


const API_URL = import.meta.env.VITE_LOCAL_API_URL;

function NewChat() {
    const navigate = useNavigate();
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);

    const handleSend = async (text) => {
        setIsSending(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/v1/new_chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            });
            if (!response.ok) {
                throw new Error(`error: ${response.status}`);
            }
            const { chat_id } = await response.json();
            // Chat component is in charge of sending new message, including the veru first one
            navigate(`/${chat_id}`, { state: { firstMessage: text } });

        } catch (err) {
            setError(err.message);
            setIsSending(false);
        }
    };

    return (
        <div id="NewChat">
            <SideBar />
            <div id="left-side">
                <div id="title-container">
                    <h1 id="title-text">Начните чат с</h1>
                    <img id="title-img" src="../../public/assets/psb_assistent_text.svg" alt="ПСБ Ассистент" />
                </div>
                {error && <p className="new-chat-error">Ошибка при создании чата: {error}</p>}
                <PromptInput onSend={handleSend} disabled={isSending} />
            </div>
        </div>
    );
}


export default NewChat;