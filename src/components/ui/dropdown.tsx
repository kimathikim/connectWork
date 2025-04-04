import React, { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDown } from 'lucide-react'

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, children, align = 'right', className = '' }: DropdownProps) {
  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      <Menu.Button as={Fragment}>{trigger}</Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items 
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
        >
          <div className="py-1">{children}</div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function DropdownItem({ children, className = '', ...props }: DropdownItemProps) {
  return (
    <Menu.Item>
      {({ active }) => (
        <button
          className={`${
            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
          } group flex w-full items-center px-4 py-2 text-sm ${className}`}
          {...props}
        >
          {children}
        </button>
      )}
    </Menu.Item>
  )
}

export function DropdownTrigger({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      {children}
      <ChevronDown className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
    </div>
  )
}
