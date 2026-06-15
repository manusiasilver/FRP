import SelectDivisionPage from './SelectDivisionPage.jsx'

export default function SelectCompanyPage() {
  return <SelectDivisionPage isOpen includeAllCompanies userInfoEndpoint="/api/data/select-company" />
}
