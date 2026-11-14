
import "../../styles/PromptInput.css";


function PromptInput() {
    return (
        <div id="PromptInput">
            <input placeholder="Напишите свой запрос здесь" id="input-line" />
            <button id="send">
                <span className="material-symbols-outlined">send</span>
            </button>
        </div>
    );
}


export default PromptInput;