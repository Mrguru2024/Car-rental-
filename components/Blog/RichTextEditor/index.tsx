'use client'

import { useEffect, useMemo, useCallback, useState } from 'react'
import 'react-quill/dist/quill.snow.css'
import ReactQuillWrapper from './ReactQuillWrapper'
import { ErrorBoundary } from './ErrorBoundary'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  className = '',
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only render on client side to avoid SSR issues
    setMounted(true)
    
    // Suppress findDOMNode warnings (known issue with react-quill v2.0.0 and React 18)
    // This is a deprecation warning but doesn't break functionality
    const originalWarn = console.warn
    const originalError = console.error
    
    const suppressWarnings = (args: any[]) => {
      const message = typeof args[0] === 'string' ? args[0] : String(args[0] || '')
      return (
        message.includes('findDOMNode') || 
        message.includes('deprecated') ||
        message.includes('feature_collector') ||
        message.includes('using deprecated parameters') ||
        message.includes('u.default.findDOMNode')
      )
    }
    
    console.warn = (...args: any[]) => {
      if (suppressWarnings(args)) return
      originalWarn.apply(console, args)
    }
    
    console.error = (...args: any[]) => {
      if (suppressWarnings(args)) return
      originalError.apply(console, args)
    }

    return () => {
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

  const imageHandler = useCallback(async () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          alert('Please log in to upload images')
          return
        }

        const timestamp = Date.now()
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/blog/${timestamp}.${fileExt}`
        const filePath = `blog-images/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('blog-images').getPublicUrl(filePath)

        // Insert image into editor
        // Find Quill instance from DOM (react-quill stores it on the container)
        let quill = null
        const quillContainer = document.querySelector('.rich-text-editor .quill') as any
        
        if (quillContainer) {
          // Try different ways to access the Quill instance
          quill = quillContainer.__quill || 
                  quillContainer.quill ||
                  (quillContainer.querySelector('.ql-editor') as any)?.__quill ||
                  (quillContainer.querySelector('.ql-editor') as any)?.quill
        }

        if (quill && typeof quill.getSelection === 'function') {
          try {
            const range = quill.getSelection(true) || { index: quill.getLength() }
            quill.insertEmbed(range.index, 'image', publicUrl)
            quill.setSelection(range.index + 1)
          } catch (e) {
            // Fallback if insertion fails
            const imageHtml = `<p><img src="${publicUrl}" alt="Uploaded image" /></p>`
            onChange(value + imageHtml)
          }
        } else {
          // Fallback: append image to content
          const imageHtml = `<p><img src="${publicUrl}" alt="Uploaded image" /></p>`
          onChange(value + imageHtml)
        }
      } catch (error: any) {
        console.error('Error uploading image:', error)
        alert('Failed to upload image: ' + (error.message || 'Unknown error'))
      }
    }
  }, [value, onChange])

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ font: [] }],
        [{ size: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ['clean'],
      ],
      handlers: {
        image: imageHandler,
      },
    },
    clipboard: {
      matchVisual: false,
    },
  }), [imageHandler])

  const formats = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'bullet',
    'indent',
    'link',
    'image',
    'video',
    'color',
    'background',
    'align',
  ]

  return (
    <div className={`rich-text-editor ${className}`}>
      <style jsx global>{`
        .rich-text-editor .quill {
          background: white;
        }
        .dark .rich-text-editor .quill {
          background: rgb(30, 41, 59);
        }
        .rich-text-editor .ql-container {
          font-size: 16px;
          min-height: 400px;
          color: rgb(30, 41, 59);
        }
        .dark .rich-text-editor .ql-container {
          color: white;
        }
        .rich-text-editor .ql-editor {
          min-height: 400px;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          border: 1px solid rgb(229, 231, 235);
          background: rgb(249, 250, 251);
        }
        .dark .rich-text-editor .ql-toolbar {
          border-color: rgb(51, 65, 85);
          background: rgb(30, 41, 59);
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border: 1px solid rgb(229, 231, 235);
        }
        .dark .rich-text-editor .ql-container {
          border-color: rgb(51, 65, 85);
        }
        .rich-text-editor .ql-stroke {
          stroke: rgb(107, 114, 128);
        }
        .dark .rich-text-editor .ql-stroke {
          stroke: rgb(203, 213, 225);
        }
        .rich-text-editor .ql-fill {
          fill: rgb(107, 114, 128);
        }
        .dark .rich-text-editor .ql-fill {
          fill: rgb(203, 213, 225);
        }
        .rich-text-editor .ql-picker-label {
          color: rgb(107, 114, 128);
        }
        .dark .rich-text-editor .ql-picker-label {
          color: rgb(203, 213, 225);
        }
      `}</style>
      {error ? (
        <div className="min-h-[400px] border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-center">
          <div className="text-red-600 dark:text-red-400">
            <p className="font-medium mb-2">Editor failed to load</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setMounted(false)
                setTimeout(() => setMounted(true), 100)
              }}
              className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-lg hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      ) : mounted ? (
        <ErrorBoundary
          fallback={
            <div className="min-h-[400px]">
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-full min-h-[400px] px-4 py-3 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light resize-none"
              />
              <p className="mt-2 text-xs text-brand-gray dark:text-brand-white/50">
                Note: Rich text editor unavailable. Using plain text editor. You can use HTML tags for formatting.
              </p>
            </div>
          }
        >
          <ReactQuillWrapper
            theme="snow"
            value={value}
            onChange={onChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
          />
        </ErrorBoundary>
      ) : (
        <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center">
          <div className="text-brand-gray dark:text-brand-white/70">Loading editor...</div>
        </div>
      )}
    </div>
  )
}
