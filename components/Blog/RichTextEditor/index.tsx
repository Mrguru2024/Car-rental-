'use client'

import { useRef, useEffect } from 'react'
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
  const modules = {
    toolbar: [
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
    clipboard: {
      matchVisual: false,
    },
  }

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
