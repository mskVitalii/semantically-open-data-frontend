import {
  Button,
  Checkbox,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  Paper,
  RangeSlider,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconPlayerStop, IconSend } from '@tabler/icons-react'
import { useState } from 'react'
import type { SearchParams } from './types'

type SearchFormProps = {
  onSearch: (params: SearchParams) => void
  onCancel: () => void
  isLoading: boolean
}

const COUNTRIES = [{ value: 'Germany', label: 'Germany' }]

const GERMAN_CITIES = [
  { value: 'Chemnitz', label: 'Chemnitz', state: 'Saxony' },
  { value: 'Leipzig', label: 'Leipzig', state: 'Saxony' },
  { value: 'Dresden', label: 'Dresden', state: 'Saxony' },
  { value: 'Berlin', label: 'Berlin', state: 'Berlin' },
]

const GERMAN_STATES = [
  { value: 'Saxony', label: 'Saxony' },
  { value: 'Berlin', label: 'Berlin' },
]

const EMBEDDING_MODELS = [
  { value: 'baai-bge-m3', label: 'BAAI BGE-M3' },
  {
    value: 'intfloat-multilingual-e5-base',
    label: 'Intfloat Multilingual E5 Base',
  },
  { value: 'jinaai-jina-embeddings-v3', label: 'Jina Embeddings V3' },
  {
    value: 'sentence-transformers-labse',
    label: 'Sentence Transformers LaBSE',
  },
]

function SearchForm({ onSearch, onCancel, isLoading }: SearchFormProps) {
  const [question, setQuestion] = useState<string>(
    'What are the safest neighborhoods in Berlin based on recent crime statistics?',
  )
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2026])
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<
    string | null
  >('jinaai-jina-embeddings-v3')
  const [useMultiQuery, setUseMultiQuery] = useState<boolean>(false)
  const [useLlmInterpretation, setUseLlmInterpretation] =
    useState<boolean>(true)
  const [searchMode, setSearchMode] = useState<'sparse' | 'dense' | 'hybrid'>(
    'dense',
  )
  const [limit, setLimit] = useState<number>(25)
  const [useReranker, setUseReranker] = useState<boolean>(false)
  const [rerankerCandidates, setRerankerCandidates] = useState<number>(50)
  const [useMongoData, setUseMongoData] = useState<boolean>(true)
  const [mongoDataLimit, setMongoDataLimit] = useState<number>(30)

  const clampRerankerCandidates = (value: number) =>
    Math.min(200, Math.max(10, value))

  const handleSearch = () => {
    onSearch({
      question,
      filters: {
        countries: selectedCountries.length > 0 ? selectedCountries : undefined,
        states: selectedStates.length > 0 ? selectedStates : undefined,
        cities: selectedCities.length > 0 ? selectedCities : undefined,
        year_from: yearRange[0],
        year_to: yearRange[1],
        embedding_model: selectedEmbeddingModel || undefined,
      },
      useMultiQuery,
      useLlmInterpretation,
      searchMode,
      limit,
      useReranker,
      rerankerCandidates: clampRerankerCandidates(rerankerCandidates),
      useMongoData,
      mongoDataLimit,
    })
  }

  const handleKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSearch()
    }
  }

  return (
    <Paper p="md" radius="md" withBorder className="bg-gray-50">
      <Stack gap="md">
        <TextInput
          label="Question"
          placeholder="Enter your question..."
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          size="md"
          rightSection={isLoading ? <Loader size="xs" /> : null}
        />

        <MultiSelect
          label="Country"
          placeholder="Choose countries"
          data={COUNTRIES}
          value={selectedCountries}
          onChange={setSelectedCountries}
          disabled={isLoading}
          clearable
          searchable
        />

        <Group grow align="flex-start">
          <MultiSelect
            label="State (Land)"
            placeholder="Choose states"
            data={GERMAN_STATES}
            value={selectedStates}
            onChange={setSelectedStates}
            disabled={isLoading}
            clearable
            searchable
          />
          <MultiSelect
            label="City (Stadt)"
            placeholder="Choose cities"
            data={GERMAN_CITIES}
            value={selectedCities}
            onChange={setSelectedCities}
            disabled={isLoading}
            clearable
            searchable
          />
        </Group>

        <div style={{ marginTop: '3rem', marginInline: '2rem' }}>
          <RangeSlider
            label={(value) => `${value}`}
            value={yearRange}
            onChange={setYearRange}
            min={1990}
            max={2026}
            step={1}
            minRange={1}
            disabled={isLoading}
            marks={[
              { value: 1990, label: '1990' },
              { value: 2000, label: '2000' },
              { value: 2010, label: '2010' },
              { value: 2020, label: '2020' },
              { value: 2026, label: '2026' },
            ]}
            mb="xl"
            labelAlwaysOn
          />
        </div>

        <Select
          label="Embedding Model"
          placeholder="Choose embedding model"
          data={EMBEDDING_MODELS}
          value={selectedEmbeddingModel}
          onChange={setSelectedEmbeddingModel}
          disabled={isLoading}
          clearable
          searchable
        />

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Search mode
          </Text>
          <SegmentedControl
            fullWidth
            data={[
              { label: 'Sparse', value: 'sparse' },
              { label: 'Dense', value: 'dense' },
              { label: 'Hybrid', value: 'hybrid' },
            ]}
            value={searchMode}
            onChange={(value) =>
              setSearchMode(value as 'sparse' | 'dense' | 'hybrid')
            }
            disabled={isLoading}
          />
        </Stack>

        <NumberInput
          label="Limit"
          placeholder="Results limit"
          value={limit}
          onChange={(value) => {
            if (typeof value === 'number') setLimit(value)
          }}
          min={1}
          max={200}
          clampBehavior="strict"
          disabled={isLoading}
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Reranker
          </Text>
          <Switch
            label="Use reranker"
            description="Re-rank results with cross-encoder"
            checked={useReranker}
            onChange={(e) => setUseReranker(e.currentTarget.checked)}
            disabled={isLoading}
          />
        </Stack>

        {useReranker && (
          <Stack gap="xs" mb="xl">
            <Text size="sm" fw={500}>
              Reranker candidates
            </Text>
            <div style={{ marginTop: '3rem', marginInline: '2rem' }}>
              <Slider
                label={(value) => `${value}`}
                value={rerankerCandidates}
                onChange={(value) => setRerankerCandidates(value)}
                min={10}
                max={200}
                step={1}
                disabled={isLoading}
                marks={[
                  { value: 10, label: '10' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                  { value: 150, label: '150' },
                  { value: 200, label: '200' },
                ]}
                labelAlwaysOn
              />
            </div>
          </Stack>
        )}

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            MongoDB Data
          </Text>
          <Switch
            label="Enable MongoDB data retrieval step"
            description="Fetch actual data rows from MongoDB (step 3)"
            checked={useMongoData}
            onChange={(e) => setUseMongoData(e.currentTarget.checked)}
            disabled={isLoading}
          />
        </Stack>

        {useMongoData && (
          <Stack gap="xs" mb="xl">
            <Text size="sm" fw={500}>
              MongoDB Data Limit
            </Text>
            <div style={{ marginTop: '3rem', marginInline: '2rem' }}>
              <Slider
                label={(value) => `${value}`}
                value={mongoDataLimit}
                onChange={(value) => setMongoDataLimit(value)}
                min={1}
                max={1000}
                step={1}
                disabled={isLoading}
                marks={[
                  { value: 1, label: '1' },
                  { value: 100, label: '100' },
                  { value: 250, label: '250' },
                  { value: 500, label: '500' },
                  { value: 1000, label: '1000' },
                ]}
                labelAlwaysOn
              />
            </div>
          </Stack>
        )}

        <Group justify="flex-end" mb="md">
          <Checkbox
            label="Use multi-query"
            checked={useMultiQuery}
            onChange={(e) => setUseMultiQuery(e.currentTarget.checked)}
            disabled={isLoading}
          />
          <Checkbox
            label="Interpret answer using LLM"
            checked={useLlmInterpretation}
            onChange={(e) => setUseLlmInterpretation(e.currentTarget.checked)}
            disabled={isLoading}
          />

          {isLoading ? (
            <Tooltip label="Stop streaming">
              <Button
                onClick={onCancel}
                color="red"
                leftSection={<IconPlayerStop size={18} />}
                size="md"
              >
                Stop
              </Button>
            </Tooltip>
          ) : (
            <Tooltip label="Send question">
              <Button
                onClick={handleSearch}
                disabled={!question.trim()}
                leftSection={<IconSend size={18} />}
                size="md"
              >
                Send
              </Button>
            </Tooltip>
          )}
        </Group>
      </Stack>
    </Paper>
  )
}

export default SearchForm
