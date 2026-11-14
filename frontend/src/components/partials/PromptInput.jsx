
import { useRef, useState, useEffect } from "react";
import "../../styles/PromptInput.css";


const ONE_LINE_HEIGHT = 50;
const MAX_HEIGHT = 200;

function PromptInput() {
    const textareaRef = useRef(null);
    const buttonRef = useRef(null);

    const [value, setValue] = useState("");
    const [isOverflow, setIsOverflow] = useState(false);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, MAX_HEIGHT)}px`;
        setIsOverflow(ta.scrollHeight > ONE_LINE_HEIGHT);
    }, [value]);

    const handleChange = (e) => {
        setValue(e.target.value);
    };

    const handleSend = () => {
        if (value) {
            // ....api stuff
        }

        setValue("");
    };

    const handleKeyDown = (e) => {
        // Enter: send message; Shift + Enter: new line
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const hasText = value.length > 0;

    return (
        <div
            id="PromptInput"
            className={isOverflow ? "PromptInput-text-overflow" : ""}
        >
            <textarea
                ref={textareaRef}
                id="input-line"
                rows={1}
                placeholder="Напишите свой запрос здесь"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />
            <button
                id="send"
                className={hasText ? "send-active" : ""}
                onClick={handleSend}
            >
                <span className="material-symbols-outlined">send</span>
            </button>
        </div>
    );
}


export default PromptInput;