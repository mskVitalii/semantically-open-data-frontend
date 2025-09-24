import { Accordion, Badge, Group, Paper, Stack, Text } from '@mantine/core'
import { IconHash } from '@tabler/icons-react'
import { useState } from 'react'
import type { ResearchQuestionStepsType } from '../types'
import Step1Embeddings from './Step1Embeddings'
import Step2VectorSearch from './Step2VectorSearch'
import Step3Interpretation from './Step3Interpretation'

function Step0ResearchQuestion({
  index,
  steps,
}: {
  index: number
  steps: ResearchQuestionStepsType
}) {
  const [openEmbeddings, setOpenEmbeddings] = useState<string[]>()
  const question = steps.research_question
  if (!question) return null

  return (
    <Paper
      key={index}
      p="lg"
      radius="md"
      className="border border-slate-200 bg-slate-50"
      withBorder
    >
      <Stack gap="sm">
        {/* Question Header */}
        <Group justify="space-between" align="flex-start">
          <Badge size="sm" variant="light" color="blue">
            Question #{index + 1}
          </Badge>

          <Group gap="xs">
            <IconHash className="w-3 h-3 text-slate-400" />
            <Text size="xs" c="dimmed" className="font-mono">
              {question.question_hash}
            </Text>
          </Group>
        </Group>
        {/* Question Text */}
        <Text size="md" fw={600} className="text-slate-800 leading-relaxed">
          {question.question}
        </Text>
        {/* Reason */}
        <div className="mt-2 pl-4 border-l-2 border-slate-300 ">
          <Text size="sm" c="dimmed" className="text-slate-500 leading-relaxed">
            <span className="font-semibold">Reasoning:</span> {question.reason}
          </Text>
        </div>
        <Accordion value={openEmbeddings} onChange={setOpenEmbeddings} multiple>
          <Accordion.Item value="embeddings">
            <Accordion.Control>Embeddings</Accordion.Control>
            <Accordion.Panel>
              {steps.embeddings && openEmbeddings?.includes('embeddings') && (
                <Step1Embeddings
                  embeddings={{
                    ...steps.embeddings,
                    embeddings: steps.embeddings.embeddings.slice(0, 64),
                  }}
                />
              )}
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="datasets">
            <Accordion.Control>Datasets</Accordion.Control>
            <Accordion.Panel>
              {steps.datasets && <Step2VectorSearch {...steps.datasets} />}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        {steps.interpretation && (
          <Step3Interpretation {...steps.interpretation} />
        )}
      </Stack>
    </Paper>
  )
}

export default Step0ResearchQuestion
