import React from 'react'
import {defineField, defineType} from 'sanity'
import {IconPreview} from './components/IconPreview'

/** The 8 NNF icon categories (see raw-icons/README.txt). */
export const CATEGORIES = [
  {title: 'Communication', value: 'communication'},
  {title: 'Data & Technology', value: 'data-technology'},
  {title: 'Department', value: 'department'},
  {title: 'Educational', value: 'educational'},
  {title: 'Nature & Environment', value: 'nature-environment'},
  {title: 'Science & Medical', value: 'science-medical'},
  {title: 'Social & Humanitarian', value: 'social-humanitarian'},
  {title: 'Strategy & Business', value: 'strategy-business'},
] as const

export const icon = defineType({
  name: 'icon',
  title: 'Icon',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description:
        'Short machine name, lowercase with dashes, e.g. "annual-report". Used to identify the icon.',
      validation: (rule) =>
        rule
          .required()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {name: 'lowercase with dashes'}),
    }),
    defineField({
      name: 'title',
      title: 'Display title',
      type: 'string',
      description: 'Human-friendly label shown in the gallery. Defaults to the name if left blank.',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {list: CATEGORIES.map((c) => ({title: c.title, value: c.value}))},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'svgFile',
      title: 'Icon file (SVG)',
      type: 'file',
      options: {accept: 'image/svg+xml,.svg'},
      description:
        'Drag in the .svg you exported (a simple single-colour outline icon on a square canvas — ' +
        'the recommended size is 24×24). The site fits it to the NNF grid and applies the house ' +
        'blue/white treatments automatically. This is the easy option — you never touch the code.',
    }),
    defineField({
      name: 'svg',
      title: 'Or paste SVG markup (advanced)',
      type: 'text',
      rows: 6,
      description:
        'Optional alternative to uploading a file: paste the raw <svg>…</svg>. Leave blank if you ' +
        'uploaded a file above.',
    }),
  ],
  validation: (rule) =>
    rule.custom((doc: any) => {
      if (doc?.svgFile?.asset?._ref || (typeof doc?.svg === 'string' && doc.svg.trim())) return true
      return 'Add an icon: upload an SVG file or paste SVG markup.'
    }),
  preview: {
    select: {title: 'title', name: 'name', category: 'category', svg: 'svg', media: 'svgFile'},
    prepare({title, name, category, svg, media}) {
      const cat = CATEGORIES.find((c) => c.value === category)
      return {
        title: title || name || 'Untitled icon',
        subtitle: cat ? cat.title : category,
        // Render pasted markup inline; otherwise show the uploaded file's icon.
        media: svg ? <IconPreview svg={svg} /> : media,
      }
    },
  },
})
