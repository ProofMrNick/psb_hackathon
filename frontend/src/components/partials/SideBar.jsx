
import { useState, useEffect } from 'react';
import { useFetchGet } from "../hooks/useFetchGet.js";

import "../../styles/SideBar.css";


function ChatLoader() {
    const API_URL = import.meta.env.VITE_LOCAL_API_URL;
    
    const { 
        data: chats, 
        loading, 
        error 
    } = useFetchGet(`${API_URL}/api/v1/chats`);


    if (loading) {
        return (
            <p>Загрузка</p>
        )
    }

    if (error) {
        return (
            <p>Ошибка</p>
        );
    }

    if (chats) {
        return (
            chats.map((chat) => (
                <p className="chat-elem" data-id={`${chat.id}`}>{`${chat.title}`}</p>
            ))
        );
    }
}



function SideBar() {
    const chat = {id: 0, title: "Изменения в налоговом законодательстве осенью 2026 года"};

    return (
        <div id="Sidebar">
            <img id="main-logo" src="../../../public/assets/psb_logo.svg" alt="ПСБ Ассистент" />
            <div id="buttons">
                <div className="btn">
                    <span className="material-symbols-outlined">chat_add_on</span>
                    <p className="btn-p">Новый чат</p>
                </div>
            </div>
            <div id="chats-container">
                <p id="your-chats">Ваши чаты</p>
                <div id="chat-list">
                    { /* <ChatLoader /> */ }
                    <p className="chat-elem chat-elem-selected" data-id={`${chat.id}`}>{`${chat.title}`}</p>
                </div>
            </div>
        </div>
    );
}

export default SideBar;