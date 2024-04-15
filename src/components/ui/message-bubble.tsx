"use client"

import Markdown from "react-markdown"
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css' // `rehype-katex` does not import the CSS for you

export default function MessageBubble( { role , content }) {
    let bubbleStyle = "hidden";
    if (role == "user") bubbleStyle = "user-message";
    else if (role == "assistant") bubbleStyle = "assistant-message";
    return (
        <div className={`prose prose-gray dark:prose-invert max-w-none leading-snug whitespace-pre-line ${bubbleStyle}`}>
          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</Markdown>
        </div>
    );
  }