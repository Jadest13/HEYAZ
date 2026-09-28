import { textStyles } from '@heyaz/app/styles/typography';
import { typography as t } from '@heyaz/app/styles/typography';
import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { theme } from '@heyaz/app/styles/index';
import {
  Button,
  Card,
  Stack,
  Grid,
  Row,
  Between,
  Title,
  Muted,
  Tag,
  Input,
  Label,
  Select,
  Progress,
} from '@heyaz/app/components/common/ui.web';
export function DesignSystem() {
  const { section = 'typography' } = useParams();
  const [progress, setProgress] = useState(60);
  const [notice, setNotice] = useState('');
  return (
    <Stack>
      <div>
        <Tag>HEYAZ DESIGN SYSTEM</Tag>
        <h1 style={{ marginTop: 14 }}>일관된 경험을 만드는 기준</h1>
        <Muted>실제 앱에서 사용하는 디자인 토큰과 공통 컴포넌트입니다.</Muted>
      </div>
      <Row>
        {[
          ['typography', 'Typography'],
          ['color', 'Color'],
          ['component', 'Component'],
        ].map(([path, label]) => (
          <NavLink
            key={path}
            to={`/design-system/${path}`}
            style={({ isActive }) => ({
              padding: '12px 18px',
              borderRadius: 10,
              background: isActive ? theme.colors.accentSoft : theme.colors.surface,
              color: isActive ? theme.colors.accent : theme.colors.text,
            })}
          >
            {label}
          </NavLink>
        ))}
      </Row>
      {section === 'typography' ? (
        <>
          <Card>
            <Title>Font family</Title>
            <p style={{ marginTop: 16 }}>{theme.typography.fontFamily}</p>
            <Muted>설치된 폰트에 따라 시스템 폰트로 대체됩니다.</Muted>
          </Card>
          <Card>
            <Title>Typography 원칙</Title>
            <p>
              본문 16px · 보조 설명 14px · 최소 캡션 13px. 제목은 22–36px로 구분하고, 본문은 1.65배
              줄 간격으로 읽기 편하게 구성합니다.
            </p>
            <Muted>
              크기뿐 아니라 굵기와 줄 간격을 함께 사용합니다. 숫자 요약은 metric, 페이지 제목은
              heading, 카드 제목은 title을 사용합니다.
            </Muted>
          </Card>
          {Object.entries(textStyles).map(([key, style]) => (
            <Card key={key}>
              <Between>
                <Tag>{key}</Tag>
                <Muted>
                  {style.fontSize}px · 줄 간격 {style.lineHeight} · 굵기 {style.fontWeight}
                </Muted>
              </Between>
              <p style={{ ...style, margin: '20px 0', overflowWrap: 'anywhere' }}>
                오늘의 움직임이 내일의 나를 만듭니다.
              </p>
              <Muted>
                {
                  {
                    display: '대표 문구와 메인 비주얼',
                    heading: '페이지 제목',
                    title: '카드와 섹션 제목',
                    lead: '강조 설명',
                    body: '일반 본문과 입력',
                    label: '버튼·필드 이름',
                    small: '보조 설명',
                    caption: '배지·날짜·차트 설명',
                    metric: '체중·운동량 등 숫자 요약',
                  }[key as keyof typeof textStyles]
                }
              </Muted>
            </Card>
          ))}
          <Card>
            <Title>Font weight</Title>
            <Row style={{ marginTop: 20 }}>
              {[400, 500, 600, 700, 800].map((weight) => (
                <span key={weight} style={{ fontWeight: weight, fontSize: t.title }}>
                  HEYAZ {weight}
                </span>
              ))}
            </Row>
          </Card>
        </>
      ) : section === 'color' ? (
        <Grid columns={3}>
          {Object.entries(theme.colors).map(([name, value]) => (
            <Card key={name}>
              <div
                style={{
                  height: 85,
                  borderRadius: 10,
                  background: value,
                  border: `1px solid ${theme.colors.border}`,
                  marginBottom: 16,
                }}
              />
              <Title>{name}</Title>
              <Muted>{value}</Muted>
            </Card>
          ))}
        </Grid>
      ) : section === 'component' ? (
        <>
          <Card>
            <Title>Button</Title>
            <Row style={{ marginTop: 20 }}>
              {(['primary', 'soft', 'ghost', 'danger'] as const).map((variant) => (
                <Button
                  key={variant}
                  variant={variant}
                  onClick={() => setNotice(`${variant} 버튼을 눌렀습니다.`)}
                >
                  {variant}
                </Button>
              ))}
              <Button disabled>Disabled</Button>
            </Row>
            <p role="status">{notice}</p>
          </Card>
          <Grid>
            <Card>
              <Title>Form controls</Title>
              <Stack style={{ marginTop: 20 }}>
                <Label>
                  이름
                  <Input placeholder="이름을 입력하세요" />
                </Label>
                <Label>
                  운동 목표
                  <Select>
                    <option>근력 향상</option>
                    <option>체지방 감량</option>
                  </Select>
                </Label>
                <Label>
                  비활성 입력
                  <Input disabled value="Disabled" readOnly />
                </Label>
              </Stack>
            </Card>
            <Card>
              <Title>Feedback & progress</Title>
              <Row style={{ margin: '20px 0' }}>
                <Tag>진행 중</Tag>
                <Tag tone="green">완료</Tag>
              </Row>
              <Label>
                진행률 {progress}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                />
              </Label>
              <Progress value={progress} />
              <Muted>슬라이더를 움직여 진행률을 확인하세요.</Muted>
            </Card>
          </Grid>
          <Card>
            <Title>Spacing & radius</Title>
            <Row style={{ marginTop: 20 }}>
              {Object.entries(theme.spacing).map(([name, value]) => (
                <div key={name}>
                  <div
                    style={{
                      width: value,
                      height: 24,
                      background: theme.colors.accent,
                      marginBottom: 8,
                    }}
                  />
                  <Muted>
                    {name} · {value}px
                  </Muted>
                </div>
              ))}
            </Row>
            <Row style={{ marginTop: 20 }}>
              {Object.entries(theme.radius).map(([name, value]) => (
                <div
                  key={name}
                  style={{
                    borderRadius: value,
                    border: `1px solid ${theme.colors.border}`,
                    padding: 18,
                  }}
                >
                  {name} · {value}px
                </div>
              ))}
            </Row>
          </Card>
        </>
      ) : (
        <Card>
          <h2>등록되지 않은 디자인 페이지입니다.</h2>
          <NavLink to="/design-system/typography">Typography로 이동</NavLink>
        </Card>
      )}
    </Stack>
  );
}
