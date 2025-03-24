import React from "react"
import { Global, css } from '@emotion/react'

export function GlobalStyles() {
  return (
    <Global
      styles={css`
        body {
          margin: 0;
          padding: 0;
          background-color:   rgb(81, 29, 29);
          color: #1a202c;
          font-family: 'Open Sans', system-ui, sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Roboto', system-ui, sans-serif;
        }
        
        a {
          color:rgb(87, 89, 204);
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        button, input, select, textarea {
          font-family: 'Open Sans', system-ui, sans-serif;
        }
        
        ::selection {
          background-color: #CC7357;
          color: white;
        }
      `}
    />
  )
}
