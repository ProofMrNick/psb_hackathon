
import "../styles/NewChat.css";

import SideBar from "./partials/SideBar.jsx";
import PromptInput from "./partials/PromptInput.jsx";


function NewChat() {
    return (
        <div id="NewChat">
            <SideBar />
            <div id="left-side">
                <div id="title-container">
                    <h1 id="title-text">Начните чат с</h1>
                    <img id="title-img" src="../../public/assets/psb_assistent_text.svg" />
                </div>
                <PromptInput />
            </div>
        </div>
    );
}


export default NewChat;