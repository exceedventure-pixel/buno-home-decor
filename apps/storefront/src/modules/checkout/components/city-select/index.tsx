import { forwardRef } from "react"

import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"
import { BD_DISTRICTS } from "@lib/bd-districts"

/**
 * District selector for checkout. The delivery charge depends on whether the district is Dhaka,
 * so this is a required, constrained choice rather than a free-text field.
 */
const CitySelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ placeholder = "Select your district", ...props }, ref) => {
    return (
      <NativeSelect ref={ref} placeholder={placeholder} {...props}>
        {BD_DISTRICTS.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </NativeSelect>
    )
  }
)

CitySelect.displayName = "CitySelect"

export default CitySelect
