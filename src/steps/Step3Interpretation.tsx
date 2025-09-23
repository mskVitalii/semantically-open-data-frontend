import type { Step3InterpretationType } from '../types'

function Step3Interpretation({
  question_hash,
  answer,
}: Step3InterpretationType) {
  return (
    <div>
      Step3Interpretation {question_hash} {answer}
    </div>
  )
}

export default Step3Interpretation
