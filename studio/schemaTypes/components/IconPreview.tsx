import React from 'react'

/**
 * Renders an icon's raw SVG markup as the list/preview thumbnail in the Studio,
 * so editors can see the icon they're working on. The stored SVG is the NNF
 * `_blue` variant (blue stroke on transparent), which reads well on the
 * Studio's light preview surface.
 */
export function IconPreview({svg}: {svg?: string}) {
  if (!svg) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
      // The SVG comes from trusted editors of this Studio only.
      dangerouslySetInnerHTML={{__html: svg}}
    />
  )
}
