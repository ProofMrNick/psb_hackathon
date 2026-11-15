
function RichText({ text }) {
    const pattern = /<(span class=["'](peach|yellow|pink|purple|green|cyan)["']|h4)>([\s\S]*?)<\/(?:span|h4)>/gi;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const openingTag = match[1];
        const colorClass = match[2];
        const innerText = match[3];

        if (openingTag === "h4") {
            parts.push(<h4 key={`h4-${match.index}`}>{innerText}</h4>);
        } else {
            parts.push(
                <span key={`span-${match.index}`} className={colorClass}>
                    {innerText}
                </span>
            );
        }

        lastIndex = match.index + match[0].length;
    }

    parts.push(text.slice(lastIndex));

    return <>{parts}</>;
}

export default RichText;