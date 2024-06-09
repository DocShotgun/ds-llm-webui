// Types and interfaces

export interface GlobalConfig {
    api_url: string
    api_key?: string
    max_seq_len: number
    system_prompt: string
    system_prompt_parsed: string
    response_prefix: string
    wolfram_appid?: string
    default_samplers?: GenParams
    default_tools?: ToolStatus
  }
  
export type GenParams = { [key:string] : any }

export type ToolStatus = { [key:string] : boolean }

export type Tool = {
  name: string;
  description: string;
  params: ToolParam[];
}

export type ToolParam = {
  name: string;
  description: string;
  type: string;
  enum?: any[];
}

export type MessageType = { role: string, content: string }