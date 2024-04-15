// Types and interfaces

export interface GlobalConfig {
    api_url: string
    api_key?: string
    system_prompt?: string
    wolfram_appid?: string
    default_samplers?: GenParams
    default_tools?: ToolStatus
  }
  
export type GenParams = { [key:string] : any }

export type ToolStatus = { [key:string] : boolean }

export type MessageType = { role: string, content: string }