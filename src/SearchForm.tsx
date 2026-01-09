import {
  Button,
  Checkbox,
  Group,
  Loader,
  MultiSelect,
  Paper,
  RangeSlider,
  Select,
  Stack,
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
  const [yearRange, setYearRange] = useState<[number, number]>([2000, 2024])
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<
    string | null
  >('baai-bge-m3')
  const [useMultiQuery, setUseMultiQuery] = useState<boolean>(false)
  const [useLlmInterpretation, setUseLlmInterpretation] =
    useState<boolean>(false)

  // Filter states based on selected cities
  const getAvailableStates = () => {
    if (selectedCities.length === 0) return GERMAN_STATES
    const statesFromCities = new Set(
      selectedCities.map(
        (cityValue) => GERMAN_CITIES.find((c) => c.value === cityValue)?.state,
      ),
    )
    return GERMAN_STATES.filter((state) => statesFromCities.has(state.value))
  }

  // Filter cities based on selected states
  const getAvailableCities = () => {
    if (selectedStates.length === 0) return GERMAN_CITIES
    return GERMAN_CITIES.filter((city) => selectedStates.includes(city.state))
  }

  // Handle state selection with city filtering
  const handleStateChange = (states: string[]) => {
    setSelectedStates(states)
    // Remove cities that don't belong to selected states
    const validCities = selectedCities.filter((cityValue) => {
      const city = GERMAN_CITIES.find((c) => c.value === cityValue)
      return states.includes(city?.state || '')
    })
    setSelectedCities(validCities)
  }

  // Handle city selection with state filtering
  const handleCityChange = (cities: string[]) => {
    setSelectedCities(cities)
    // Update states based on selected cities
    if (cities.length === 0) {
      setSelectedStates([])
    } else {
      const statesFromCities = new Set(
        cities.map(
          (cityValue) =>
            GERMAN_CITIES.find((c) => c.value === cityValue)?.state,
        ),
      )
      setSelectedStates(Array.from(statesFromCities) as string[])
    }
  }

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
            data={getAvailableStates()}
            value={selectedStates}
            onChange={handleStateChange}
            disabled={isLoading}
            clearable
            searchable
          />
          <MultiSelect
            label="City (Stadt)"
            placeholder="Choose cities"
            data={getAvailableCities()}
            value={selectedCities}
            onChange={handleCityChange}
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

        <Group>
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
        </Group>

        <Group justify="flex-end">
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
