import SelectDivisionPage from './SelectDivisionPage.jsx'

export default function SelectCompanyPage() {
  return (
    <SelectDivisionPage
      isOpen
      includeAllCompanies
      forceFetchUserInfo
      userInfoEndpoint="/api/data/select-company"
    />
  )
}
