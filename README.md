# TranslatorApp

Azure Static Web Apps와 Azure Functions를 사용하는 간단한 번역 웹앱입니다.

## Azure 설정

Static Web App의 **Configuration > Application settings**에 아래 값을 추가해야 합니다.

- `TRANSLATOR_KEY`: Azure AI Translator 리소스의 Key
- `TRANSLATOR_REGION`: Translator 리소스의 Region 이름. 예: `koreacentral`, `eastus`
- `TRANSLATOR_ENDPOINT`: 선택 사항. 기본값은 `https://api.cognitive.microsofttranslator.com`

`TRANSLATOR_REGION`은 Azure 포털의 Translator 리소스 지역과 정확히 일치해야 합니다.

## 배포 구조

- 정적 앱: `/index.html`
- Azure Functions API: `/api/translate`
- GitHub Actions 설정: `.github/workflows/azure-static-web-apps-icy-tree-06b17c910.yml`
