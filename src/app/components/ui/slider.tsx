import * as React from "react";
import { cn } from "@/app/components/ui/utils";

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
}

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step,
  className,
}: SliderProps) {
  const handleChange = (index: number, newValue: number) => {
    const newValues = [...value];
    newValues[index] = newValue;
    
    // Ensure range sliders don't cross
    if (newValues.length === 2) {
      if (index === 0 && newValues[0] > newValues[1]) {
        newValues[0] = newValues[1];
      }
      if (index === 1 && newValues[1] < newValues[0]) {
        newValues[1] = newValues[0];
      }
    }
    
    onValueChange(newValues);
  };

  const getPercentage = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };

  return (
    <div className={cn("relative flex items-center w-full h-5", className)}>
      {/* Track */}
      <div className="absolute w-full h-2 bg-secondary rounded-full" />
      
      {/* Active Range (for range sliders) */}
      {value.length === 2 && (
        <div
          className="absolute h-2 bg-accent rounded-full"
          style={{
            left: `${getPercentage(value[0])}%`,
            width: `${getPercentage(value[1]) - getPercentage(value[0])}%`,
          }}
        />
      )}
      
      {/* Single Active (for single sliders) */}
      {value.length === 1 && (
        <div
          className="absolute h-2 bg-accent rounded-full"
          style={{
            left: 0,
            width: `${getPercentage(value[0])}%`,
          }}
        />
      )}

      {/* Thumbs */}
      {value.map((val, index) => (
        <input
          key={index}
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => handleChange(index, Number(e.target.value))}
          className="absolute w-full h-2 appearance-none bg-transparent cursor-pointer slider-thumb"
          style={{
            zIndex: index + 1,
          }}
        />
      ))}
    </div>
  );
}
