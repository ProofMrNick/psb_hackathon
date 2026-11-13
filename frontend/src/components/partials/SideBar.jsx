
import { useState, useEffect } from 'react';
import { useFetchGet } from "../hooks/useFetchGet.js";

const API_URL = import.meta.env.VITE_LOCAL_API_URL;

import "../../styles/SideBar.css";

function SideBar() {
    const { 
        chats: data, 
        chatsLoading: loading, 
        chatsError: error 
    } = useFetchGet(`${API_URL}/api/v1/chats`);

    return (
        <div id="sidebar">
            <img id="main-logo" src="../../../public/assets/psb_logo.svg" alt="ПСБ Ассистент" />
            <div id="buttons">
                <div class="btn">
                    <span class="material-symbols-outlined">chat_add_on</span>
                    <p class="btn-p">Новый чат</p>
                </div>
            </div>
            <div id="chats-container">
                <p>Ваши чаты</p>
                <div id="chat-list">
                    { chatsLoading && <p>Загрузка</p> }
                    { chatsError && <p>Произвошла ошибка при загрузке чатов</p> }
                    {
                        chats.map((chat) => (
                            <p id={`${chat.chat_id}`} class="chat-elem">{`${chat.title}`}</p>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}

export default SideBar;