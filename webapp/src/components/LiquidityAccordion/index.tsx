import React, { useState } from 'react';
import {
  CardBody,
  Card,
  Row,
  Col,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';
import { MdMoreHoriz } from 'react-icons/md';
import { I18n } from 'react-redux-i18n';

import styles from './LiquidityAccordion.module.scss';
import {
  CREATE_POOL_PAIR_PATH,
  ADD,
  REMOVE,
  REMOVE_LIQUIDITY_BASE_PATH,
} from '../../constants';
import PairIcon from '../PairIcon';

interface LiquidityAccordionProps {
  history: any;
  poolpair: any;
}

const LiquidityAccordion: React.FunctionComponent<LiquidityAccordionProps> = (
  props: LiquidityAccordionProps
) => {
  const { history } = props;
  const liquidityCardMenu = [
    {
      label: I18n.t('containers.swap.swapPage.add'),
      value: ADD,
    },
    {
      label: I18n.t('containers.swap.swapPage.remove'),
      value: REMOVE,
    },
  ];

  const handleDropDowns = (data: string, poolpair) => {
    if (data === ADD) {
      history.push(CREATE_POOL_PAIR_PATH);
    } else {
      history.push(
        `${REMOVE_LIQUIDITY_BASE_PATH}/${
          poolpair.poolID
        }?sharePercentage=${Number(poolpair.poolSharePercentage).toFixed(8)}`
      );
    }
  };

  const [collapse, setCollapse] = useState(false);

  const { poolpair } = props;

  const toggle = () => setCollapse(!collapse);

  return (
    <div>
      <Card onClick={toggle} className={`${styles.liquidityCard} mb-5`}>
        <CardBody>
          <Row className='align-items-center'>
            <Col md={2}>
              <PairIcon poolpair={poolpair} />
            </Col>
            <Col md={5}>
              <span>{`${poolpair.tokenA}/${poolpair.tokenB}`}</span>
            </Col>
            <Col md={5} className='text-right'>
              <UncontrolledDropdown>
                <DropdownToggle color='link' size='md'>
                  <MdMoreHoriz />
                </DropdownToggle>
                <DropdownMenu right>
                  {liquidityCardMenu.map((data) => {
                    return (
                      <DropdownItem
                        className='justify-content-between'
                        key={data.value}
                        value={data.value}
                        onClick={() => handleDropDowns(data.value, poolpair)}
                      >
                        <span>{I18n.t(data.label)}</span>
                      </DropdownItem>
                    );
                  })}
                </DropdownMenu>
              </UncontrolledDropdown>
            </Col>
          </Row>
          <br />
          <Row>
            <Col className={styles.apy}>
              {I18n.t('containers.swap.swapPage.apy')}
            </Col>
            <Col className={`${styles.apyValue} ${styles.text}`}>
              {poolpair.reserveA}
            </Col>
          </Row>
          <Row>
            <Col className={styles.label}>
              {I18n.t('containers.swap.swapPage.pooled')}
              &nbsp;
              {`${poolpair.tokenA}`}
            </Col>
            <Col className={`${styles.unit} ${styles.text}`}>
              {poolpair.reserveA}
            </Col>
          </Row>
          <Row>
            <Col className={styles.label}>
              {I18n.t('containers.swap.swapPage.pooled')}
              &nbsp;
              {`${poolpair.tokenB}`}
            </Col>
            <Col className={`${styles.unit} ${styles.text}`}>
              {poolpair.reserveB}
            </Col>
          </Row>
          <Row>
            <Col className={styles.label}>
              {I18n.t('containers.swap.swapPage.poolShare')}
            </Col>
            <Col className={`${styles.unit} ${styles.text}`}>
              {`${Number(poolpair.poolSharePercentage).toFixed(8)} %`}
            </Col>
          </Row>
        </CardBody>
      </Card>
    </div>
  );
};

export default LiquidityAccordion;
