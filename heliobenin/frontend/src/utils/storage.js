export const saveParticulier = (newData) => {
  const existing = JSON.parse(localStorage.getItem('heliobenin_particulier') || '{}')
  localStorage.setItem('heliobenin_particulier', JSON.stringify({ ...existing, ...newData }))
}

export const getParticulier = () => {
  return JSON.parse(localStorage.getItem('heliobenin_particulier') || '{}')
}
