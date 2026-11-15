
function RichText({ text }) {
    const pattern = /<span class=["'](peach|yellow|pink|purple|green|cyan)["']>(.*?)<\/span>/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));  // regualr text with no <span>
        }
        parts.push(  // pasrts with <span> (found by regex)
            <span key={`${match.index}-${match[1]}`} className={match[1]}>
                {match[2]}
            </span>
        );
        lastIndex = match.index + match[0].length;
    }
    parts.push(text.slice(lastIndex));  // the last text fragment after the last <span>

    return <>{parts}</>;
}


export default RichText;