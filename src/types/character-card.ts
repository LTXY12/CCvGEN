// Character Card V3 Specification Types
export interface CharacterCardV3 {
  spec: 'chara_card_v3'
  spec_version: '3.0'
  data: CharacterData
}

export interface CharacterData {
  // V2 Compatible Fields
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: string[]
  
  // V3 New Fields
  assets?: Asset[]
  nickname?: string
  creator_notes_multilingual?: Record<string, string>
  source?: string[]
  group_only_greetings: string[]
  creation_date?: number
  modification_date?: number
  character_book?: Lorebook
  
  // Extensions
  extensions?: Extensions
}

export interface Asset {
  type: string
  uri: string
  name: string
  ext: string
}

export interface Lorebook {
  name?: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  extensions?: Record<string, any>
  entries: LorebookEntry[]
}

export interface LorebookEntry {
  keys: string[]
  content: string
  extensions?: Record<string, any>
  enabled: boolean
  insertion_order: number
  case_sensitive?: boolean
  name?: string
  priority?: number
  id?: number
  comment?: string
  selective?: boolean
  secondary_keys?: string[]
  constant?: boolean
  position?: 'before_char' | 'after_char'
}

export interface Extensions {
  risuai?: RisuAIExtensions
  [key: string]: any
}

export interface RisuAIExtensions {
  customScripts?: CustomScript[]
  bias?: Array<{ key: string; value: number }>
  viewScreen?: string
  sdData?: Array<{
    type: string
    name: string
    prompt: string
    negative: string
  }>
  additionalAssets?: Asset[]
  [key: string]: any
}

export interface CustomScript {
  comment: string
  in: string
  out: string
  type: 'editdisplay' | 'editinput' | 'triggeredscript'
  ableFlag?: boolean
}