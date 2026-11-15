
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";

import { useFetchGet } from "./hooks/useFetchGet.js";
import SideBar from "./partials/SideBar.jsx";
import PromptInput from "./partials/PromptInput.jsx";
import RichText from "./partials/RichText.jsx";
import DocumentCards from "./partials/DocumentCards.jsx";

import "../styles/Chat.css";


const API_URL = import.meta.env.VITE_LOCAL_API_URL;

function Chat() {
    const { chat_id } = useParams();
    const location = useLocation();

    const { data: history, loading, error } = useFetchGet(`${API_URL}/api/v1/${chat_id}/history`);

    const [messages, setMessages] = useState([]);
    const [isSending, setIsSending] = useState(false);
    
    const messagesListRef = useRef(null);
    const firstMessageSent = useRef(false);
    const historyLoaded = useRef(false);

    useEffect(() => {
        if (loading || error || historyLoaded.current) return;
        
        historyLoaded.current = true;
        setMessages(history || []);
    }, [loading, error, history]);

    useEffect(() => {
        if (loading) return;
        if (firstMessageSent.current) return;
        
        if (location.state && location.state.firstMessage) {
            firstMessageSent.current = true;
            window.history.replaceState(null, "");
            sendMessage(location.state.firstMessage);
        }
    }, [loading]);

    const sendMessage = async (text) => {
        setIsSending(true);

        const userMsgId = `user-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            { id: userMsgId, role: "user", content: text },
        ]);

        try {
            const response = await fetch(`${API_URL}/api/v1/${chat_id}/user_message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            });
            if (!response.ok) {
                throw new Error(`error: ${response.status}`);
            }
            const answer = await response.json();

            setMessages((prev) => [...prev, answer.assistant_message]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { id: `error-${Date.now()}`, role: "error", content: `Не удалось получить ответ: ${err.message}` },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        const list = messagesListRef.current;
        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages.length, isSending]);

    if (loading) {
        return (
            <div id="Chat">
                <SideBar />
                <div id="left-side" className="left-side-filled">
                    <p className="chat-status">Загрузка чата...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div id="Chat">
                <SideBar />
                <div id="left-side" className="left-side-filled">
                    <p className="chat-status">Ошибка загрузки чата: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div id="Chat">
            <SideBar />
            <div id="left-side" className="left-side-filled">
                <div id="messages" ref={messagesListRef}>
                    {messages.map((message) => (
                        <div key={message.id} className="message-block">
                            {message.role === "assistant" && message.documents && message.documents.length > 0 && (
                                <DocumentCards
                                    chatId={chat_id}
                                    messageId={message.id}
                                    documents={message.documents}
                                />
                            )}
                            <div className={`message message-${message.role}`}>
                                <RichText text={message.content} />
                            </div>
                        </div>
                    ))}
                    {isSending && (
                        <div className="message message-assistant">Получение ответа...</div>
                    )}
                </div>
                <PromptInput onSend={sendMessage} disabled={isSending} />
            </div>
        </div>
    );
}


export default Chat;