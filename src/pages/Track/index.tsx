import { PageContainer } from '@ant-design/pro-components';
import { Button } from 'antd';
import MarkMap from  '@/components/MarkMap/RealLine';

const TrackPage: React.FC = () => {
  return (
    <PageContainer
      ghost
      header={{
        title: '地图轨迹',
      }}
    >
          <Button>改变轨迹</Button>
          <MarkMap />
    </PageContainer>
  );
};

export default TrackPage;
