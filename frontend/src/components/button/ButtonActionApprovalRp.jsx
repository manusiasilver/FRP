import React from 'react'
import { useNavigate } from 'react-router-dom'
import ButtonPrintPdf from './ButtonPrintPdf.jsx'
import ButtonKeFrp from './ButtonKeFrp.jsx'
import ButtonAccessManagerRp from './ButtonAccessManagerRp.jsx'
import ButtonAccessStaffRp from './ButtonAccessStaffRp.jsx'

function printRpPdf(rpId) {
  if (!rpId || typeof window === 'undefined') return
  window.open(`/api/rp/${rpId}/print`, '_blank')
}

export default function ButtonActionApprovalRp({
  rp,
  user,
  userDivision,
  isProcessDivision,
  actionLoading,
  requestAction,
  setSelected,
  onCheckData,
  mode = 'staff', // ✅ UBAH: default 'both' → 'staff' (fallback aman)
  options = {}
}) {
  const navigate = useNavigate()
  const { showDetail = true, showPreview = true, showKeFrp = true, showActions = true, showRevert = true } = options

  const userJobLevelRank = Number(user?.jobLevelRank || user?.job_level_rank || 0)
  const userJobLevelName = String(user?.selectedJobLevel || user?.jobLevelName || '').toLowerCase()
  const canTakeApprovalAction = userJobLevelRank >= 2 && !/\bstaff\b/.test(userJobLevelName)
  const isStaff = userJobLevelRank === 1
  const isAdmin = user?.role === 'administrator'
  const canProcessThisRp =
    isAdmin ||
    (typeof isProcessDivision === 'function' && isProcessDivision(rp?.processedByDepartment || rp?.diprosesOleh))

  const canCreateFrp =
    rp.status === 'approved' &&
    (isAdmin || (userDivision && ['it', 'product', 'produk'].includes(userDivision.toLowerCase())))

  // ✅ UBAH: dari mode !== 'staff' / mode !== 'manager'
  // menjadi perbandingan eksplisit agar mode='both' tidak merender keduanya
  const showManagerActions = mode === 'manager'
  const showStaffActions = mode === 'staff'

  // console.log('=== ButtonActionApprovalRp Debug ===')
  // console.log('User Job Level Rank:', userJobLevelRank)
  // console.log('User Job Level Name:', userJobLevelName)

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {((showPreview && ['approved', 'CREATED_FRP'].includes(rp.status)) || (canCreateFrp && showKeFrp)) && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          {showPreview && ['approved', 'CREATED_FRP'].includes(rp.status) && (
            <ButtonPrintPdf onClick={() => printRpPdf(rp.id)}>Print PDF</ButtonPrintPdf>
          )}
          {canCreateFrp && showKeFrp && (
            <ButtonKeFrp onClick={() => navigate(`/frp?fromRp=${rp.id}`)}>FRP</ButtonKeFrp>
          )}
        </div>
      )}

      {showManagerActions && (
        <ButtonAccessManagerRp
          rp={rp}
          user={user}
          userJobLevelRank={userJobLevelRank}
          canTakeApprovalAction={canTakeApprovalAction}
          actionLoading={actionLoading}
          requestAction={requestAction}
          onCheckData={onCheckData}
          navigate={navigate}
          setSelected={setSelected}
          showActions={showActions}
          canProcessThisRp={canProcessThisRp}
        />
      )}

      {showStaffActions && (
        <ButtonAccessStaffRp
          rp={rp}
          userDivision={userDivision}
          actionLoading={actionLoading}
          requestAction={requestAction}
          onCheckData={onCheckData}
          setSelected={setSelected}
          showActions={showActions}
          showDetail={showDetail}
          showRevert={showRevert}
          isStaff={isStaff}
          canProcessThisRp={canProcessThisRp}
        />
      )}
    </div>
  )
}
