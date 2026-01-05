'use client'

import { useRef, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

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
  const quillRef = useRef<any>(null)

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

        // Insert image into editor - find Quill instance from DOM
        const quillContainer = document.querySelector('.rich-text-editor .quill') as any
        const quill = quillContainer?.__quill
        if (quill) {
          const range = quill.getSelection(true)
          quill.insertEmbed(range.index, 'image', publicUrl)
          quill.setSelection(range.index + 1)
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
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  )
}
