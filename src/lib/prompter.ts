"use client"

export default function parse_macros (prompt: string) {
    let parsed_prompt = prompt;

    const date = new Date();

    parsed_prompt = parsed_prompt.replaceAll("{{date}}", date.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    }));

    parsed_prompt = parsed_prompt.replaceAll("{{time}}", date.toLocaleString(undefined, {
        hour: "numeric",
        minute: "numeric",
        timeZoneName: "short",
    }));

    parsed_prompt = parsed_prompt.replaceAll("{{weekday}}", date.toLocaleString(undefined, {
        weekday: "long",
    }));

    return parsed_prompt;
}