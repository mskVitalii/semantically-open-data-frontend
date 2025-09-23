import { Paper, Group, TextInput, Loader, Tooltip, Button } from '@mantine/core'
import { IconPlayerStop, IconSend } from '@tabler/icons-react'
import { useState } from 'react'

type SearchFormProps = {
  onSearch: (query: string) => void
  onCancel: () => void
  isLoading: boolean
}

function SearchForm({ onSearch, onCancel, isLoading }: SearchFormProps) {
  const [question, setQuestion] = useState<string>(
    'What is the color of grass in Germany?',
  )
  const handleKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSearch(question)
    }
  }

  return (
    <Paper p="md" radius="md" withBorder className="bg-gray-50">
      <Group align="flex-end">
        <TextInput
          className="flex-1"
          label="Question"
          placeholder="Enter your question..."
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          size="md"
          rightSection={isLoading ? <Loader size="xs" /> : null}
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
              onClick={() => onSearch(question)}
              disabled={!question.trim()}
              leftSection={<IconSend size={18} />}
              size="md"
            >
              Send
            </Button>
          </Tooltip>
        )}
      </Group>
    </Paper>
  )
}

export default SearchForm
