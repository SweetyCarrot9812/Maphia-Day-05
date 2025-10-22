'use client'

import { useState, useEffect } from 'react'
import { useSearchStore } from '@/stores/searchStore'
import { Search, X, Loader2 } from 'lucide-react'

export function SearchBar() {
  const [inputValue, setInputValue] = useState('')
  const { search, isLoading, clearSearch } = useSearchStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      await search(inputValue.trim())
    }
  }

  const handleClear = () => {
    setInputValue('')
    clearSearch()
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <div className="absolute left-4 text-gray-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="장소, 음식점, 카페 등을 검색하세요"
          className="
            w-full
            pl-12 pr-12
            py-3
            bg-white
            border border-gray-300
            rounded-full
            shadow-md
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-transparent
            text-gray-900
            placeholder-gray-400
          "
          disabled={isLoading}
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute right-4
              text-gray-400
              hover:text-gray-600
              transition-colors
            "
            aria-label="검색어 지우기"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </form>
  )
}
