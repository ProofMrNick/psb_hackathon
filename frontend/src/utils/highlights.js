
export const assignColor = (str) => {
    if (str.includes("<span class=")) {
        if (str.includes("peach")) return "peach";
        if (str.includes("yellow")) return "yellow";
        if (str.includes("pink")) return "pink";
        if (str.includes("purple")) return "purple";
        if (str.includes("green")) return "green";
        if (str.includes("cyan")) return "cyan";
    }
}

export const stripTags = (str) => {
    return str.replace(/<[^>]+>/g, "");
}

export const filterHighlights = (str, color) => {
    return str.replace(
        /<span class=["'](peach|yellow|pink|purple|green|cyan)["']>([\s\S]*?)<\/span>/g,
        (whole, spanColor, inner) => (spanColor === color ? whole : inner)
    );
}

export const prefixH1 = (text) => {
    let lines = text.split("\n");
    lines[0] = `<h4>${lines[0]}</h4>`;
    return lines.join("\n");
}