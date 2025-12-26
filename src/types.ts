// #region llm_dto.py

export type LLMQuestion = {
  question: string
  reason: string
  question_hash: string
}

export type LLMQuestionWithEmbeddings = {
  question: string
  reason: string
  question_hash: string
  embeddings: number[]
}

export type LLMQuestionWithDatasets = {
  question: string
  reason: string
  question_hash: string
  datasets: DatasetResponse[]
}

// #endregion

// #region datasets_metadata.py
export type DatasetMetadata = {
  id: string
  title: string
  description?: string | null
  organization?: string | null
  metadata_created?: string | null
  metadata_modified?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  tags?: string[] | null
  groups?: string[] | null
  url?: string | null
  author?: string | null
}

export type Field = {
  type: string
  name: string
  unique_count: number
  null_count: number
}

export type FieldNumeric = Field & {
  type: 'Numeric'
  mean: number
  std: number
  quantile_0_min: number
  quantile_25: number
  quantile_50_median: number
  quantile_75: number
  quantile_100_max: number
  distribution: string
}

export type FieldString = Field & {
  type: 'String'
}

export type FieldDate = Field & {
  type: 'Date'
  min: string
  max: string
  mean: string
}

export type DatasetMetadataWithFields = DatasetMetadata & {
  fields?: Record<string, FieldNumeric | FieldString | FieldDate>
}

export type DatasetResponse = {
  score: number
  metadata: DatasetMetadataWithFields
}

export type DatasetSearchResponse = {
  datasets: DatasetResponse[]
  total: number
  limit: number
  offset: number
}

export type DatasetSearchRequest = {
  query?: string | null
  tags?: string[] | null
  limit: number
  offset: number
}

export type SearchCriteria = {
  query?: string | null
  tags?: string[]
  limit: number
  offset: number
}
// #endregion

// #region QA steps

// 0. LLM QUESTIONS
export type Step0ResearchQuestionsType = {
  question: string
  research_questions: LLMQuestion[]
}

// 1. EMBEDDINGS
export type Step1EmbeddingsType = LLMQuestionWithEmbeddings

// 2. VECTOR SEARCH
export type Step2VectorSearchType = {
  question_hash: string
  datasets: DatasetResponse[]
}

// 3. INTERPRETATION
export type Step3InterpretationType = {
  question_hash: string
  answer: string
}

// #endregion

export type ResearchQuestionStepsType = {
  research_question?: LLMQuestion
  embeddings?: Step1EmbeddingsType
  datasets?: Step2VectorSearchType
  interpretation?: Step3InterpretationType
}

export type SearchFilters = {
  countries?: string[]
  states?: string[]
  cities?: string[]
}

export type SearchParams = {
  question: string
  filters: SearchFilters
  useMultiQuery: boolean
  useLlmInterpretation: boolean
}
