
import { useNavigate, useParams } from "react-router-dom";

import { useFetchGet } from "../hooks/useFetchGet.js";

import "../../styles/SideBar.css";


const API_URL = import.meta.env.VITE_LOCAL_API_URL;

function SideBar() {
    const navigate = useNavigate();
    const params = useParams();

    const {
        data,
        loading,
        error,
    } = useFetchGet(`${API_URL}/api/v1/chats`);
    const chats = data ? [...data.chat_names].reverse() : [];

    return (
        <div id="Sidebar">
            <img id="main-logo" src="../../../public/assets/psb_logo.svg" alt="ПСБ Ассистент" />
            <div id="buttons">
                <div className="btn" onClick={() => navigate("/")}>
                    <span className="material-symbols-outlined">chat_add_on</span>
                    <p className="btn-p">Новый чат</p>
                </div>
            </div>
            <div id="chats-container">
                <p id="your-chats">Ваши чаты</p>
                <div id="chat-list">
                    {loading && <p>Загрузка</p>}
                    {error && <p>Не удалось загрузить чаты</p>}
                    {chats.map((chat) => (
                        <p
                            key={chat.id}
                            className={String(chat.id) === params.chat_id ? "chat-elem chat-elem-selected" : "chat-elem"}
                            onClick={() => navigate(`/${chat.id}`)}
                            title={chat.title}
                        >
                            {chat.title}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
}


export default SideBar;