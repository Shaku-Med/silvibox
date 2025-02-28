import React, { useEffect, useRef } from 'react'
import { Redirect, router } from 'expo-router'
import { AuthContext, handleAuthContext } from './Context/Context'

export default function index() {
  let {x}: any = handleAuthContext()
  return (
    <>
       <Redirect href={`${x.current ? `/` : `/(auth)`}`}/>
    </>
  )
}