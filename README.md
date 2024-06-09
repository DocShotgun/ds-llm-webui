## ds-llm-webui

A simple tool-use assistant for local LLMs powered by TabbyAPI. This should be considered heavily WIP and not intended for end-user usage at the moment, however it does have the following features:

- Converse with an AI assistant via the chat completions endpoint of [TabbyAPI](https://github.com/theroyallab/tabbyAPI), with a single persistent chat history and limited sampling options
- Function calling framework via constrained generation using JSON schema
- Internet search using DuckDuckGo for search-augmented generation
- Extract the text content of a webpage for augmented generation
- Search a configured set of RSS feeds for updated news (URLs must be provided in config.json as an array of strings)
- Use the Wolfram Alpha LLM API for relevant queries
- Search PubMed via the NCBI E-utilities API for relevant queries

Mileage may vary depending on the capabilities of the LLM itself. Intended to be used with [CohereForAI/c4ai-command-r-plus](https://huggingface.co/CohereForAI/c4ai-command-r-plus). Make a copy of `userdata/config.example.json` and rename it to `config.json`.

This is a [Next.js](https://nextjs.org/) project using components from [shadcn/ui](https://ui.shadcn.com/). 

To run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.