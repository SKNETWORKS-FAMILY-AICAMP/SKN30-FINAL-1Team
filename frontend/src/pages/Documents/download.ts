// 자료 파일 내려받기. 드로어의 버전 이력과 목록 표가 같이 씁니다.
//
// 실제 파일은 이 세션에서 올린 것만 있습니다. 시드 문서에는 blob 이 없어 대신
// 같은 이름의 안내 텍스트를 내려 줍니다 — 목록의 받기 버튼이 줄마다 있는데
// 누를 때만 아무 일도 안 일어나면 고장으로 보입니다.
// 스토리지가 붙으면 blob 자리에 원본이 들어오고 이 대체 경로는 지나가지 않습니다.
import type { DocumentVersion } from '@/types'

/** 내려줄 파일 하나. 원본이 없으면 시연용 텍스트로 대신합니다. */
function fileOf(version: DocumentVersion): { blob: Blob; name: string } {
  if (version.blob) return { blob: version.blob, name: version.fileName }

  const notice = [
    version.fileName,
    `v${version.version} · ${version.owner} · ${version.uploaded}`,
    '',
    '시연 데이터라 원본 파일이 없습니다. 스토리지가 붙으면 실제 파일이 내려옵니다.',
    '',
  ].join('\n')

  return {
    // 확장자를 원본 그대로 두면 열리지 않는 파일이 되어 .txt 로 바꿔 답니다.
    name: `${version.fileName} (시연).txt`,
    blob: new Blob([notice], { type: 'text/plain;charset=utf-8' }),
  }
}

/** 객체 URL 은 쓰고 바로 반납해야 탭이 닫힐 때까지 남지 않습니다. */
export function downloadVersion(version: DocumentVersion) {
  const file = fileOf(version)
  const url = URL.createObjectURL(file.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
}
