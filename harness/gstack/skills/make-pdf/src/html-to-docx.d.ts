declare module 'html-to-docx' {
  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString: string | null,
    documentOptions?: { title?: string; creator?: string },
  ): Promise<Uint8Array | Blob>;
}
