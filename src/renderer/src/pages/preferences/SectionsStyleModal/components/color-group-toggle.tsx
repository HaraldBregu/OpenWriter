import { clsx } from "clsx";
import Typogaphy from "@/components/Typography";
import * as ToggleGroup from '@radix-ui/react-toggle-group';

const COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#ffa500', label: 'Orange' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#00ff00', label: 'Lime' },
  { value: '#00ffff', label: 'Cyan' },
  { value: '#4682b4', label: 'Steel Blue' },
  { value: '#0000ff', label: 'Blue' },
  { value: '#8000ff', label: 'Purple' },
  { value: '#000000', label: 'Black' }
];


function ColorToggleGroup({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div>
        <Typogaphy component="p" className="ml-2 mb-1 text-[12px] font-semibold">{"Text Color"}</Typogaphy>
      </div>
      <ToggleGroup.Root
        type="single"
        value={value}
        onValueChange={(val) => val && onChange(val)}
        className="flex gap-2 flex-wrap p-1"
      >
        {COLORS.map((color) => (
          <ToggleGroup.Item
            key={color.value}
            value={color.value}
            className={clsx(
              'w-[40px] h-[40px] border border-gray-300',
              value === color.value && 'outline outline-[3px] outline-blue-600',
            )}
            style={{ backgroundColor: color.value, borderColor: color.value === '#ffffff' ? '#C2C7CF' : color.value }}
            aria-label={`Color ${color.label}`}
          />
        ))}
      </ToggleGroup.Root>
    </div>
  );
}

export default ColorToggleGroup;