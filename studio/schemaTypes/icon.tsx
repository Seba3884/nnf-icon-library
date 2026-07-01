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
        'Machine name, lowercase, e.g. "calendar" or "annual-report". Used to identify the icon in the library.',
      validation: (rule) =>
        rule
          .required()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
            name: 'lowercase kebab-case',
          }),
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
      name: 'svg',
      title: 'SVG source',
      type: 'text',
      rows: 8,
      description:
        'Paste the icon SVG on the NNF grid: viewBox="0 0 40 40" with an outer ' +
        '<g transform="translate(8,8)" …> wrapper (the "_blue" variant). The site ' +
        'strips the baked-in colours and draws each colour/circle treatment itself.',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (typeof value !== 'string') return 'SVG is required'
          if (!/<svg[\s>]/i.test(value)) return 'Must contain an <svg> element'
          return true
        }),
    }),
  ],
  preview: {
    select: {title: 'title', name: 'name', category: 'category', svg: 'svg'},
    prepare({title, name, category, svg}) {
      const cat = CATEGORIES.find((c) => c.value === category)
      return {
        title: title || name || 'Untitled icon',
        subtitle: cat ? cat.title : category,
        media: svg ? <IconPreview svg={svg} /> : undefined,
      }
    },
  },
})
