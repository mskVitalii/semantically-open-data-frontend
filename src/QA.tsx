import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconQuestionMark,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import SearchForm from './SearchForm'
import Step0ResearchQuestion from './steps/Step0ResearchQuestion'
import type {
  ResearchQuestionStepsType,
  SearchParams,
  Step0ResearchQuestionsType,
  Step1EmbeddingsType,
  Step2VectorSearchType,
  Step3InterpretationType,
} from './types'

type StreamResponse =
  | {
      step: 0
      status: 'OK'
      data: Step0ResearchQuestionsType
    }
  | {
      step: 1
      status: 'OK'
      data: Step1EmbeddingsType[]
    }
  | {
      step: 2
      sub_step: number
      status: 'OK'
      data: Step2VectorSearchType
    }
  | {
      step: 3
      sub_step: number
      status: 'OK'
      data: Step3InterpretationType
    }
  | {
      step: number
      status: 'error'
      error: string
    }

const QA: React.FC = () => {
  const [response, setResponse] = useState<StreamResponse[]>([])
  const [rq, setRQ] = useState<Record<string, ResearchQuestionStepsType>>({})
  const rqArray = useMemo(() => Object.entries(rq), [rq])
  const [question, setQuestion] = useState<string>()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const parseSSELine = (line: string): StreamResponse | null => {
    try {
      if (line === '[DONE]') return null

      return JSON.parse(line)
    } catch {
      // If not JSON, treat as plain text
      console.error('Failed to parse:', line)
      return null
    }
  }

  const handleStream = useCallback(async (params: SearchParams) => {
    handleClear()
    setIsLoading(true)

    let eventSource: EventSource | null = null
    let isManualClose = false

    try {
      console.log(`request to ${import.meta.env.VITE_API_URL}/v1/datasets/qa`)
      const endpoint = `${import.meta.env.VITE_API_URL}/v1/datasets/qa`

      // Формируем параметры запроса
      const queryParams = new URLSearchParams()
      queryParams.append('question', params.question)
      queryParams.append('use_multi_query', params.useMultiQuery.toString())
      queryParams.append(
        'use_llm_interpretation',
        params.useLlmInterpretation.toString(),
      )

      // Добавляем фильтры если они есть
      if (params.filters.countries && params.filters.countries.length > 0) {
        params.filters.countries.forEach((country) =>
          queryParams.append('country', country),
        )
      }
      if (params.filters.states && params.filters.states.length > 0) {
        params.filters.states.forEach((state) =>
          queryParams.append('state', state),
        )
      }
      if (params.filters.cities && params.filters.cities.length > 0) {
        params.filters.cities.forEach((city) =>
          queryParams.append('city', city),
        )
      }
      if (params.filters.embedding_model) {
        queryParams.append('embedder_model', params.filters.embedding_model)
      }
      if (typeof params.filters.year_from === 'number') {
        queryParams.append('year_from', params.filters.year_from.toString())
      }
      if (typeof params.filters.year_to === 'number') {
        queryParams.append('year_to', params.filters.year_to.toString())
      }

      const url = `${endpoint}?${queryParams.toString()}`

      eventSource = new EventSource(url)

      eventSource.onopen = () => {
        console.log('EventSource connection opened')
      }

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]' || event.data.includes('[DONE]')) {
          console.log('Stream completed successfully')
          eventSource?.close()
          setIsLoading(false)
          return
        }

        const parsed = parseSSELine(event.data)

        if (parsed) {
          setResponse((prev) => [...prev, parsed])

          if (parsed.status === 'error') return
          else if (parsed.step === 0)
            setRQ(
              parsed.data.research_questions.reduce(
                (acc, _rq) => {
                  acc[_rq.question_hash] = { research_question: _rq }
                  return acc
                },
                {} as Record<string, ResearchQuestionStepsType>,
              ),
            )
          else if (parsed.step === 1)
            setRQ((prev) => {
              parsed.data.forEach((q) => (prev[q.question_hash].embeddings = q))
              return prev
            })
          else if (parsed.step === 2)
            setRQ((prev) => {
              prev[parsed.data.question_hash].datasets = parsed.data
              return prev
            })
          else if (parsed.step === 3)
            setRQ((prev) => {
              prev[parsed.data.question_hash].interpretation = parsed.data
              return prev
            })
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        if (isManualClose) eventSource?.close()

        if (eventSource?.readyState === EventSource.CLOSED) {
          console.log('Connection closed normally')
        } else if (eventSource?.readyState === EventSource.CONNECTING) {
          setError('Сonnection lost. Attempting to reconnect...')
        } else {
          setError('Connection error occurred')
        }

        setIsLoading(false)
        eventSource?.close()
      }

      abortControllerRef.current = {
        abort: () => {
          isManualClose = true
          eventSource?.close()
          setError('Request was cancelled')
          setIsLoading(false)
        },
      } as AbortController
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error: ${err.message}`)
        console.error('Stream error:', err)
      } else {
        setError('An unknown error occurred')
      }
      setIsLoading(false)
    }

    return () => {
      isManualClose = true
      eventSource?.close()
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [])

  const handleCancel = useCallback((): void => {
    if (!abortControllerRef.current) return
    abortControllerRef.current.abort()
    abortControllerRef.current = null
  }, [])

  const handleSubmit = (params: SearchParams): void => {
    if (!isLoading && params.question.trim()) {
      setQuestion(params.question.trim())
      handleStream(params)
    }
  }

  const handleClear = (): void => {
    setResponse([])
    setError('')
    setRQ({})
  }

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="md"
      className="min-h-screen w-screen bg-gray-50 p-4"
    >
      <Stack>
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={2} className="text-gray-800">
            Semantically Open Data QA
          </Title>
          <Badge color="blue" variant="light" size="lg">
            SSE Stream
          </Badge>
        </Group>

        {/* Input Section */}
        <SearchForm
          onSearch={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />

        {/* Error Display */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            variant="light"
            withCloseButton
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Response Display */}
        {response.length > 0 && (
          <>
            <Group justify="space-between" mb="sm">
              <Group>
                <Text fw={600} size="lg" className="text-gray-700">
                  Response
                </Text>
                {isLoading && (
                  <Badge color="blue" variant="dot" size="sm">
                    Streaming...
                  </Badge>
                )}
              </Group>
              <Tooltip label="Clear response">
                <ActionIcon onClick={handleClear} variant="subtle" color="gray">
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>

            {rqArray.length > 0 && (
              <div className="w-full mx-auto p-4">
                <Card
                  shadow="md"
                  radius="lg"
                  className="bg-white dark:bg-slate-900"
                  withBorder
                >
                  {/* Header Section */}
                  <div className="mb-6">
                    <Group align="center" mb="md">
                      <div className="p-2 rounded-lg bg-blue-500">
                        <IconQuestionMark className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <Title order={2} className="text-slate-800">
                          Research Question Analysis
                        </Title>
                        <Text size="sm" c="dimmed" className="mt-1">
                          {rqArray.length} sub-questions generated
                        </Text>
                      </div>
                      <Badge size="lg" variant="filled" color="blue">
                        {rqArray.length} Questions
                      </Badge>
                    </Group>

                    {/* Main Question Card */}
                    <Paper p="lg" radius="md" className="bg-blue-600">
                      <Group align="flex-start">
                        <IconSparkles className="w-5 h-5" />
                        <div className="flex-1">
                          <Text
                            size="xs"
                            className="opacity-90 uppercase tracking-wider font-semibold mb-1"
                          >
                            Primary Research Question
                          </Text>
                          <Text size="lg" fw={600} className="leading-relaxed">
                            {question}
                          </Text>
                        </div>
                      </Group>
                    </Paper>
                  </div>

                  <Divider my="xl" />

                  {/* Questions List */}
                  <div className="mb-4">
                    <Text fw={500} size="lg" className="text-slate-700  mb-4">
                      Research Sub-Questions
                    </Text>

                    <Stack gap="md">
                      {rqArray.map(([question_hash, question], i) => (
                        <Step0ResearchQuestion
                          key={question_hash}
                          index={i}
                          steps={question}
                        />
                      ))}
                    </Stack>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </Stack>
    </Card>
  )
}

export default QA
