import type { Step2VectorSearchType } from '../types'

function Step2VectorSearch({ question_hash, datasets }: Step2VectorSearchType) {
  return (
    <div>
      Step2VectorSearch {question_hash} {datasets.length}
    </div>
  )
}

export default Step2VectorSearch
