/**
 * EXAMPLE: Document Analysis Integration
 * 
 * This is an example implementation showing how to integrate AWS Textract
 * or Google Document AI for actual document content analysis.
 * 
 * This file is NOT imported - it's a reference implementation.
 * Copy and adapt this code to lib/verification/documentAnalysis.ts when ready.
 */

// ============================================================================
// OPTION 1: AWS Textract Integration
// ============================================================================

/*
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract'
import { createClient } from '@/lib/supabase/server'

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function analyzeDocumentWithTextract(
  documentUrl: string,
  documentType: string
): Promise<{
  extractedFields: Record<string, string>
  confidence: number
  rawText: string
}> {
  // Download document from Supabase storage
  const response = await fetch(documentUrl)
  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.statusText}`)
  }

  const fileBuffer = await response.arrayBuffer()
  const fileBytes = new Uint8Array(fileBuffer)

  // Detect MIME type from URL or response headers
  const mimeType = documentUrl.endsWith('.pdf')
    ? 'application/pdf'
    : documentUrl.endsWith('.png')
    ? 'image/png'
    : 'image/jpeg'

  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: fileBytes,
    },
    FeatureTypes: ['FORMS', 'TABLES'],
  })

  try {
    const result = await textractClient.send(command)
    
    // Extract text and key-value pairs from blocks
    const blocks = result.Blocks || []
    const keyValuePairs: Record<string, string> = {}
    const textBlocks: string[] = []

    // Process blocks to extract key-value pairs and text
    blocks.forEach((block) => {
      if (block.BlockType === 'LINE') {
        textBlocks.push(block.Text || '')
      }
      // Extract key-value pairs from FORM blocks
      // (Simplified - actual implementation would need to parse relationships)
    })

    return {
      extractedFields: keyValuePairs,
      confidence: 0.9, // Textract doesn't provide overall confidence, estimate
      rawText: textBlocks.join(' '),
    }
  } catch (error) {
    console.error('Textract analysis error:', error)
    throw error
  }
}
*/

// ============================================================================
// OPTION 2: Google Document AI Integration
// ============================================================================

/*
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { createClient } from '@/lib/supabase/server'

const documentAIClient = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  // Or use credentials from environment:
  // credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
})

// Get processor name based on document type
function getProcessorName(documentType: string): string {
  // These processor IDs are created in Google Cloud Console
  const processors: Record<string, string> = {
    drivers_license_front: process.env.GOOGLE_DOCAI_DRIVER_LICENSE_PROCESSOR_ID!,
    drivers_license_back: process.env.GOOGLE_DOCAI_DRIVER_LICENSE_PROCESSOR_ID!,
    business_license: process.env.GOOGLE_DOCAI_BUSINESS_LICENSE_PROCESSOR_ID!,
    // Add more as needed
  }

  // Fallback to general form processor
  return processors[documentType] || process.env.GOOGLE_DOCAI_FORM_PROCESSOR_ID!
}

export async function analyzeDocumentWithGoogle(
  documentUrl: string,
  documentType: string
): Promise<{
  extractedFields: Record<string, string>
  confidence: number
  entities: any[]
}> {
  // Download document
  const response = await fetch(documentUrl)
  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.statusText}`)
  }

  const fileBuffer = await response.arrayBuffer()
  const fileBytes = Buffer.from(fileBuffer)

  // Detect MIME type
  const mimeType = documentUrl.endsWith('.pdf')
    ? 'application/pdf'
    : documentUrl.endsWith('.png')
    ? 'image/png'
    : 'image/jpeg'

  const processorName = getProcessorName(documentType)
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!
  const location = process.env.GOOGLE_DOCAI_LOCATION || 'us'

  const name = `projects/${projectId}/locations/${location}/processors/${processorName}`

  const request = {
    name,
    rawDocument: {
      content: fileBytes,
      mimeType,
    },
  }

  try {
    const [result] = await documentAIClient.processDocument(request)
    const document = result.document

    // Extract entities (structured fields)
    const extractedFields: Record<string, string> = {}
    document.entities?.forEach((entity) => {
      if (entity.type && entity.textAnchor?.textSegments) {
        extractedFields[entity.type] = entity.textAnchor.textSegments
          .map((seg) => document.text?.substring(seg.startIndex || 0, seg.endIndex || 0))
          .join(' ')
      }
    })

    return {
      extractedFields,
      confidence: document.textStyles?.[0]?.confidence || 0.9,
      entities: document.entities || [],
    }
  } catch (error) {
    console.error('Document AI analysis error:', error)
    throw error
  }
}
*/

// ============================================================================
// Usage in documentVerificationBot.ts
// ============================================================================

/*
import { analyzeDocumentWithTextract } from './documentAnalysis'

// In runDocumentVerificationBot function:

// After basic checks, analyze document content:
const documentPath = documents[documentType]
if (documentPath) {
  try {
    // Get signed URL from Supabase storage
    const supabase = await createClient()
    const { data: urlData } = supabase.storage
      .from('verification-docs')
      .createSignedUrl(documentPath, 3600) // 1 hour expiry

    if (urlData?.signedUrl) {
      const analysisResult = await analyzeDocumentWithTextract(
        urlData.signedUrl,
        documentType
      )

      // Compare extracted data with profile data
      const contentFlags = compareDocumentContent(
        analysisResult.extractedFields,
        profile,
        documentType
      )
      
      flags.push(...contentFlags)
    }
  } catch (error) {
    console.error(`Error analyzing document ${documentType}:`, error)
    // Log error but continue with basic checks
  }
}
*/
