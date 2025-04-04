import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, isValid, parse } from 'date-fns'

interface DatePickerProps {
  selectedDate: Date | null
  onDateChange: (date: Date | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  selectedDate,
  onDateChange,
  placeholder = 'Select date',
  className = '',
  disabled = false,
  minDate,
  maxDate
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [calendarDates, setCalendarDates] = useState<Date[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // Update input value when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, 'MM/dd/yyyy'))
    } else {
      setInputValue('')
    }
  }, [selectedDate])

  // Generate calendar dates
  useEffect(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Get day of week for first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay()
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek
    
    // Calculate total days to show (max 6 weeks = 42 days)
    const totalDays = 42
    
    // Generate array of dates
    const dates: Date[] = []
    
    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      dates.push(date)
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      dates.push(date)
    }
    
    // Add days from next month
    const remainingDays = totalDays - dates.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      dates.push(date)
    }
    
    setCalendarDates(dates)
  }, [currentMonth])

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    // Try to parse date from input
    const parsedDate = parse(value, 'MM/dd/yyyy', new Date())
    
    if (isValid(parsedDate)) {
      onDateChange(parsedDate)
    }
  }

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    onDateChange(date)
    setIsOpen(false)
  }

  // Handle previous month
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  // Handle next month
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if date is selected
  const isSelectedDate = (date: Date) => {
    if (!selectedDate) return false
    
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  // Check if date is disabled
  const isDisabledDate = (date: Date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
          disabled={disabled}
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 bg-white rounded-md shadow-lg">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 rounded-md"
              >
                &lt;
              </button>
              <div className="font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded-md"
              >
                &gt;
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mt-1">
              {calendarDates.map((date, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  disabled={isDisabledDate(date)}
                  className={`
                    p-1 text-sm rounded-md
                    ${isCurrentMonth(date) ? 'text-gray-900' : 'text-gray-400'}
                    ${isToday(date) ? 'border border-[#CC7357]' : ''}
                    ${isSelectedDate(date) ? 'bg-[#CC7357] text-white' : 'hover:bg-gray-100'}
                    ${isDisabledDate(date) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              ))}
            </div>
            
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  onDateChange(null)
                  setIsOpen(false)
                }}
                className="text-xs text-[#CC7357] hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
